// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VotingSystem {
    
    struct Candidate {
        string name;
        uint256 voteCount;
    }
    
    struct VotingForum {
        string title;
        address admin;
        Candidate[] candidates;
        mapping(address => bool) hasVoted;
        mapping(address => uint256) voterChoice;
        mapping(address => string) voterReasons;
        address[] voters;
        bool isActive;
        uint256 createdAt;
    }
    
    mapping(bytes32 => VotingForum) public votingForums;
    bytes32[] public forumIds;
    
    event ForumCreated(bytes32 indexed forumId, string title, address indexed admin);
    event VoteCasted(bytes32 indexed forumId, address indexed voter, uint256 candidateIndex);
    event VotingEnded(bytes32 indexed forumId);
    
    // Membuat forum voting baru
    function createVotingForum(
        string memory _title,
        string[] memory _candidateNames
    ) public returns (bytes32) {
        require(_candidateNames.length >= 2, "Minimal 2 kandidat diperlukan");
        
        // Generate unique ID untuk forum
        bytes32 forumId = keccak256(abi.encodePacked(_title, msg.sender, block.timestamp));
        
        VotingForum storage newForum = votingForums[forumId];
        newForum.title = _title;
        newForum.admin = msg.sender;
        newForum.isActive = true;
        newForum.createdAt = block.timestamp;
        
        // Tambahkan kandidat
        for (uint256 i = 0; i < _candidateNames.length; i++) {
            newForum.candidates.push(Candidate({
                name: _candidateNames[i],
                voteCount: 0
            }));
        }
        
        forumIds.push(forumId);
        
        emit ForumCreated(forumId, _title, msg.sender);
        
        return forumId;
    }
    
    // Voter melakukan voting
    function vote(
        bytes32 _forumId,
        uint256 _candidateIndex,
        string memory _reason
    ) public {
        VotingForum storage forum = votingForums[_forumId];
        
        require(forum.isActive, "Voting sudah berakhir");
        require(_candidateIndex < forum.candidates.length, "Kandidat tidak valid");
        require(!forum.hasVoted[msg.sender], "Anda sudah melakukan voting");
        
        // Catat vote
        forum.hasVoted[msg.sender] = true;
        forum.voterChoice[msg.sender] = _candidateIndex;
        forum.voterReasons[msg.sender] = _reason;
        forum.voters.push(msg.sender);
        forum.candidates[_candidateIndex].voteCount++;
        
        emit VoteCasted(_forumId, msg.sender, _candidateIndex);
    }
    
    // Update vote (sebelum submit final - untuk UI handling)
    function updateVote(
        bytes32 _forumId,
        uint256 _newCandidateIndex,
        string memory _newReason
    ) public {
        VotingForum storage forum = votingForums[_forumId];
        
        require(forum.isActive, "Voting sudah berakhir");
        require(_newCandidateIndex < forum.candidates.length, "Kandidat tidak valid");
        require(forum.hasVoted[msg.sender], "Anda belum melakukan voting");
        
        uint256 oldChoice = forum.voterChoice[msg.sender];
        
        // Update vote count
        forum.candidates[oldChoice].voteCount--;
        forum.candidates[_newCandidateIndex].voteCount++;
        
        // Update pilihan dan alasan
        forum.voterChoice[msg.sender] = _newCandidateIndex;
        forum.voterReasons[msg.sender] = _newReason;
        
        emit VoteCasted(_forumId, msg.sender, _newCandidateIndex);
    }
    
    // Admin mengakhiri voting
    function endVoting(bytes32 _forumId) public {
        VotingForum storage forum = votingForums[_forumId];
        
        require(msg.sender == forum.admin, "Hanya admin yang bisa mengakhiri voting");
        require(forum.isActive, "Voting sudah berakhir");
        
        forum.isActive = false;
        
        emit VotingEnded(_forumId);
    }
    
    // Get detail forum
    function getForumDetails(bytes32 _forumId) public view returns (
        string memory title,
        address admin,
        bool isActive,
        uint256 totalVoters,
        uint256 createdAt
    ) {
        VotingForum storage forum = votingForums[_forumId];
        return (
            forum.title,
            forum.admin,
            forum.isActive,
            forum.voters.length,
            forum.createdAt
        );
    }
    
    // Get kandidat
    function getCandidates(bytes32 _forumId) public view returns (
        string[] memory names,
        uint256[] memory voteCounts
    ) {
        VotingForum storage forum = votingForums[_forumId];
        uint256 candidateCount = forum.candidates.length;
        
        names = new string[](candidateCount);
        voteCounts = new uint256[](candidateCount);
        
        for (uint256 i = 0; i < candidateCount; i++) {
            names[i] = forum.candidates[i].name;
            voteCounts[i] = forum.candidates[i].voteCount;
        }
        
        return (names, voteCounts);
    }
    
    // Cek apakah address sudah vote
    function hasVoted(bytes32 _forumId, address _voter) public view returns (bool) {
        return votingForums[_forumId].hasVoted[_voter];
    }
    
    // Get pilihan voter (untuk admin melihat alasan)
    function getVoterChoice(bytes32 _forumId, address _voter) public view returns (
        uint256 candidateIndex,
        string memory reason
    ) {
        VotingForum storage forum = votingForums[_forumId];
        require(msg.sender == forum.admin, "Hanya admin yang bisa melihat alasan");
        
        return (
            forum.voterChoice[_voter],
            forum.voterReasons[_voter]
        );
    }
    
    // Get semua voter dan alasan mereka (khusus admin)
    function getAllVotersWithReasons(bytes32 _forumId) public view returns (
        address[] memory voterAddresses,
        uint256[] memory choices,
        string[] memory reasons
    ) {
        VotingForum storage forum = votingForums[_forumId];
        require(msg.sender == forum.admin, "Hanya admin yang bisa melihat data ini");
        
        uint256 voterCount = forum.voters.length;
        voterAddresses = new address[](voterCount);
        choices = new uint256[](voterCount);
        reasons = new string[](voterCount);
        
        for (uint256 i = 0; i < voterCount; i++) {
            address voter = forum.voters[i];
            voterAddresses[i] = voter;
            choices[i] = forum.voterChoice[voter];
            reasons[i] = forum.voterReasons[voter];
        }
        
        return (voterAddresses, choices, reasons);
    }
    
    // Get pemenang
    function getWinner(bytes32 _forumId) public view returns (
        string memory winnerName,
        uint256 winnerVotes,
        uint256 winnerIndex
    ) {
        VotingForum storage forum = votingForums[_forumId];
        
        uint256 maxVotes = 0;
        uint256 winningIndex = 0;
        
        for (uint256 i = 0; i < forum.candidates.length; i++) {
            if (forum.candidates[i].voteCount > maxVotes) {
                maxVotes = forum.candidates[i].voteCount;
                winningIndex = i;
            }
        }
        
        return (
            forum.candidates[winningIndex].name,
            maxVotes,
            winningIndex
        );
    }
    
    // Get total forum
    function getTotalForums() public view returns (uint256) {
        return forumIds.length;
    }
    
    // Get forum by index
    function getForumIdByIndex(uint256 _index) public view returns (bytes32) {
        require(_index < forumIds.length, "Index tidak valid");
        return forumIds[_index];
    }
}